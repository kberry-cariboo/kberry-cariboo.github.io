-- Each member's own preferences: theme, forecast window, column orders,
-- dashboard layout and Entries filters.
--
-- They used to be household fields, so one person switching to dark mode or
-- filtering Entries changed every other member's screen. They are now rows in
-- member_preferences, one per member. This asserts, as each caller against a
-- real database, that one member's preferences:
--   - come back to them exactly, on any device,
--   - never reach another member, by the RPC or by reading the table directly,
--   - are theirs to keep even as a view-only member,
--   - were seeded from what the household shared before the split,
-- and that an old tab still sending them in the household payload is accepted
-- without them coming back out of it.
--
--   psql -v ON_ERROR_STOP=1 -f supabase/schema.sql
--   psql -v ON_ERROR_STOP=1 -f tests/member-prefs.sql
do $$
declare
  owner_id uuid := gen_random_uuid();
  member_id uuid := gen_random_uuid();
  viewer_id uuid := gen_random_uuid();
  hid uuid;
  code text;
  got jsonb;
  failed boolean;
  n int;
  checks int := 0;
begin
  insert into auth.users (id, email) values
    (owner_id, 'prefs-owner@example.com'),
    (member_id, 'prefs-member@example.com'),
    (viewer_id, 'prefs-viewer@example.com');
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  hid := create_household('Owner');
  code := create_invite();
  perform set_config('request.jwt.claim.sub', member_id::text, true);
  perform join_household(code, 'Member');
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  code := create_invite();
  perform set_config('request.jwt.claim.sub', viewer_id::text, true);
  perform join_household(code, 'Viewer');
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  update household_members set role = 'viewer' where user_id = viewer_id;

  -- ── An old tab still sends them in the household payload ─────────────────
  -- Accepted, not refused (they are retired keys) — and not handed back out
  -- of load_household, where every member would receive them again.
  perform save_household(jsonb_build_object(
    'entries', '[]'::jsonb, 'schemaVersion', 999,
    'darkMode', true, 'colOrder', jsonb_build_array('amount', 'desc'),
    'regFilter', 'expense'), null);
  got := (load_household())->'data';
  if got ? 'darkMode' or got ? 'colOrder' or got ? 'regFilter' then
    raise exception 'member-prefs: load_household still hands out a member preference: %',
      (select array_agg(k) from jsonb_object_keys(got) k where k in ('darkMode', 'colOrder', 'regFilter'));
  end if;
  checks := checks + 1;

  -- ── Seeding: what the household shared becomes each member's own ─────────
  -- The owner and member have no rows yet (they joined after this file ran),
  -- so the seed gives each of them the household's shared values.
  delete from member_preferences where household_id = hid;
  n := cf_seed_member_preferences();
  if n < 3 then
    raise exception 'member-prefs: the seed created % row(s) for a household of three', n;
  end if;
  perform set_config('request.jwt.claim.sub', member_id::text, true);
  got := load_my_preferences();
  if (got->>'darkMode')::boolean is distinct from true or got->'colOrder' <> '["amount", "desc"]'::jsonb then
    raise exception 'member-prefs: a member was not seeded from the household''s shared values: %', got;
  end if;
  checks := checks + 1;

  -- ── One member's preferences are theirs alone ─────────────────────────────
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  perform save_my_preferences(jsonb_build_object(
    'darkMode', false,
    'forecastHorizon', 30,
    'colOrder', jsonb_build_array('date', 'desc', 'amount'),
    'budgetColOrder', jsonb_build_array('balance', 'desc'),
    'dashHidden', jsonb_build_object('networth', true, 'endingSoon', true),
    'dashOrder', jsonb_build_array('upcoming', 'kpis'),
    'regFilter', 'income',
    'regFilterCats', jsonb_build_array('Housing'),
    'regFilterScheds', jsonb_build_array('monthly'),
    'regFilterStatus', jsonb_build_array('unpaid')));
  got := load_my_preferences();
  if got <> jsonb_build_object(
    'darkMode', false, 'forecastHorizon', 30,
    'colOrder', jsonb_build_array('date', 'desc', 'amount'),
    'budgetColOrder', jsonb_build_array('balance', 'desc'),
    'dashHidden', jsonb_build_object('endingSoon', true, 'networth', true),
    'dashOrder', jsonb_build_array('upcoming', 'kpis'),
    'regFilter', 'income',
    'regFilterCats', jsonb_build_array('Housing'),
    'regFilterScheds', jsonb_build_array('monthly'),
    'regFilterStatus', jsonb_build_array('unpaid')) then
    raise exception 'member-prefs: the owner''s preferences did not round-trip: %', got;
  end if;
  checks := checks + 1;

  perform set_config('request.jwt.claim.sub', member_id::text, true);
  got := load_my_preferences();
  if (got->>'darkMode')::boolean is distinct from true or got ? 'forecastHorizon' or got->>'regFilter' = 'income' then
    raise exception 'member-prefs: the owner''s preferences reached another member: %', got;
  end if;
  checks := checks + 1;

  -- A save carrying one field changes that field and nothing else.
  perform save_my_preferences(jsonb_build_object('regFilter', 'expense'));
  got := load_my_preferences();
  if got->>'regFilter' <> 'expense' or (got->>'darkMode')::boolean is distinct from true
     or got->'colOrder' <> '["amount", "desc"]'::jsonb then
    raise exception 'member-prefs: a one-field save disturbed the others: %', got;
  end if;
  checks := checks + 1;

  -- ── Reading the table directly, as the member ─────────────────────────────
  -- Row-level security, not only the RPC, keeps the owner's row out of reach.
  execute 'grant select on member_preferences to authenticated';
  set local role authenticated;
  select count(*) into n from member_preferences;
  reset role;
  if n <> 1 then
    raise exception 'member-prefs: a member can read % preference rows directly, not just their own', n;
  end if;
  checks := checks + 1;

  -- ── A view-only member keeps preferences like anyone else ─────────────────
  perform set_config('request.jwt.claim.sub', viewer_id::text, true);
  perform save_my_preferences(jsonb_build_object('darkMode', true, 'forecastHorizon', 60));
  got := load_my_preferences();
  if (got->>'forecastHorizon')::int is distinct from 60 then
    raise exception 'member-prefs: a viewer could not keep their own preferences: %', got;
  end if;
  checks := checks + 1;

  -- ── Refusals ──────────────────────────────────────────────────────────────
  failed := false;
  begin
    perform save_my_preferences(jsonb_build_object('entries', '[]'::jsonb));
  exception when others then failed := true;
  end;
  if not failed then
    raise exception 'member-prefs: household data was accepted as a preference';
  end if;
  checks := checks + 1;

  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  update household_members set disabled = true where user_id = member_id;
  perform set_config('request.jwt.claim.sub', member_id::text, true);
  failed := false;
  begin
    perform save_my_preferences(jsonb_build_object('darkMode', false));
  exception when others then failed := true;
  end;
  if not failed then
    raise exception 'member-prefs: a disabled member saved preferences';
  end if;
  checks := checks + 1;

  -- Re-seeding never overwrites a row a member already has.
  perform cf_seed_member_preferences();
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  got := load_my_preferences();
  if (got->>'forecastHorizon')::int is distinct from 30 then
    raise exception 'member-prefs: re-running the seed overwrote the owner''s own preferences: %', got;
  end if;
  checks := checks + 1;

  raise notice 'member-prefs: all % checks passed', checks;
end $$;
