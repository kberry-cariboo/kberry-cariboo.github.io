-- Round-trip checks for the parts of the schema the client is most likely to
-- disagree with: the statutory-holiday tables, and the client-generated row ids
-- that entries and goals are keyed by.
--
-- Run against a SCRATCH database, never a live project: it inserts a throwaway
-- household (and an auth.users row for it to hang off) and deletes both at the
-- end. Any assertion below that fails raises, so a clean run means every check
-- passed.
--
--   createdb cf_scratch
--   psql -d cf_scratch -f supabase/schema.sql
--   psql -d cf_scratch -v ON_ERROR_STOP=1 -f supabase/schema-test.sql
--
-- On a bare Postgres (no Supabase), create the pieces schema.sql expects first:
--   create schema auth;
--   create table auth.users (id uuid primary key default gen_random_uuid(), email text);
--   create function auth.uid() returns uuid language sql stable as
--     $fn$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $fn$;
--   create role anon nologin; create role authenticated nologin; create role service_role nologin;
--
-- Why this file exists: holidays were a JSON field on the save payload before
-- they were tables, and cf_apply_household_payload silently ignores keys it
-- doesn't know — so they synced to nothing at all. A payload field that no
-- table backs fails quietly, which is exactly the failure worth a test.

\set ON_ERROR_STOP on

do $$
declare
  uid uuid := '00000000-0000-4000-8000-00000000cf01';
  hid uuid := '00000000-0000-4000-8000-00000000cf02';
  got jsonb;
begin
  insert into auth.users (id, email) values (uid, 'schema-test@example.invalid')
    on conflict (id) do nothing;
  insert into households (id, name) values (hid, 'Schema test household')
    on conflict (id) do nothing;
  insert into household_members (household_id, user_id, full_name, role)
    values (hid, uid, 'Schema Test', 'owner')
    on conflict (household_id, user_id) do nothing;

  -- 1. A save writes one row per date, with its source preserved. ------------
  perform cf_apply_household_payload(hid, jsonb_build_object(
    'schemaVersion', 8,
    'holidays', jsonb_build_object(
      '2026', jsonb_build_object(
        '2026-07-01', jsonb_build_object('name', 'Canada Day', 'optional', false, 'source', 'computed'),
        '2026-12-26', jsonb_build_object('name', 'Boxing Day', 'optional', true, 'source', 'computed'),
        '2026-08-17', jsonb_build_object('name', 'Company shutdown', 'optional', false, 'source', 'manual')
      ),
      -- A year emptied by hand: no dates, but still the household's.
      '2027', '{}'::jsonb
    )
  ));

  if (select count(*) from holidays where household_id = hid) <> 3 then
    raise exception 'expected 3 holiday rows, found %', (select count(*) from holidays where household_id = hid);
  end if;
  if not exists (select 1 from holidays where household_id = hid
                  and holiday_date = date '2026-08-17' and source = 'manual' and optional = false) then
    raise exception 'the hand-added date did not survive the save with its source';
  end if;
  if not exists (select 1 from holidays where household_id = hid
                  and holiday_date = date '2026-12-26' and optional) then
    raise exception 'BC''s optional flag was lost on the way in';
  end if;
  if (select count(*) from holiday_years where household_id = hid) <> 2 then
    raise exception 'both 2026 and 2027 should be marked as the household''s';
  end if;

  -- 2. load_household hands the same shape back. ----------------------------
  perform set_config('request.jwt.claim.sub', uid::text, true);
  got := (load_household() -> 'data') -> 'holidays';
  if got -> '2026' -> '2026-08-17' ->> 'name' <> 'Company shutdown' then
    raise exception 'load_household lost the hand-added holiday: %', got;
  end if;
  if (got -> '2026' -> '2026-12-26' ->> 'optional') <> 'true' then
    raise exception 'load_household lost the optional flag: %', got;
  end if;
  -- The emptied year comes back present-but-empty. Absent would mean "nobody
  -- has touched 2027", and the app would put the built-in rules back.
  if got -> '2027' is null or got -> '2027' <> '{}'::jsonb then
    raise exception 'an emptied year should round-trip as an empty object, got %', got -> '2027';
  end if;

  -- 3. A row inserted straight into the table reaches the app. --------------
  -- The point of putting these in Postgres is being able to work with them
  -- there, so a date added in the SQL editor must not be invisible just
  -- because no holiday_years row was created alongside it.
  insert into holidays (household_id, holiday_date, name, optional, source)
    values (hid, date '2029-05-01', 'Added in SQL', false, 'manual');
  got := (load_household() -> 'data') -> 'holidays';
  if got -> '2029' -> '2029-05-01' ->> 'name' <> 'Added in SQL' then
    raise exception 'a hand-inserted row never reached the payload: %', got;
  end if;

  -- 4. Omitting a date deletes it; omitting the key changes nothing. --------
  perform cf_apply_household_payload(hid, jsonb_build_object(
    'holidays', jsonb_build_object(
      '2026', jsonb_build_object(
        '2026-07-01', jsonb_build_object('name', 'Canada Day', 'optional', false, 'source', 'published')
      ),
      '2027', '{}'::jsonb
    )
  ));
  if (select count(*) from holidays where household_id = hid) <> 1 then
    raise exception 'dates missing from the payload should have been deleted';
  end if;
  if (select source from holidays where household_id = hid and holiday_date = date '2026-07-01') <> 'published' then
    raise exception 'a re-saved date did not pick up its new source';
  end if;

  -- An older client that has never heard of holidays must not wipe them.
  perform cf_apply_household_payload(hid, '{"entries": []}'::jsonb);
  if (select count(*) from holidays where household_id = hid) <> 1 then
    raise exception 'a payload with no holidays key wiped the table';
  end if;

  -- 5. Client ids are opaque strings, not numbers. --------------------------
  -- genId() mints crypto.randomUUID() values. While these columns were bigint
  -- every entry and goal created since that change was dropped on the way in,
  -- silently — the app showed it until the next reload replaced local state
  -- with the server's copy, and it had never arrived.
  perform cf_apply_household_payload(hid, jsonb_build_object(
    'entries', jsonb_build_array(
      jsonb_build_object('id', '0d045530-5093-5be3-ab67-498da28b2b3c', 'desc', 'UUID recurring entry',
                         'type', 'income', 'amount', 250000, 'startDate', '2026-01-15',
                         'repeats', true, 'recurEvery', 1, 'recurUnit', 'month', 'category', 'Income'),
      -- A household from before the change still holds numeric ids.
      jsonb_build_object('id', 1755212345678::bigint, 'desc', 'Legacy numeric entry',
                         'type', 'expense', 'amount', 165000, 'startDate', '2026-01-01',
                         'repeats', true, 'recurEvery', 1, 'recurUnit', 'month', 'category', 'Housing')
    ),
    'goals', jsonb_build_array(
      jsonb_build_object('id', '7f3c1e22-aaaa-4bbb-8ccc-1234567890ab', 'name', 'UUID goal',
                         'target', 500000, 'saved', 0, 'monthly', 10000,
                         'entryId', '0d045530-5093-5be3-ab67-498da28b2b3c')
    )
  ));

  if not exists (select 1 from entries where household_id = hid and id = '0d045530-5093-5be3-ab67-498da28b2b3c') then
    raise exception 'an entry with a UUID id was dropped on save';
  end if;
  if not exists (select 1 from entries where household_id = hid and id = '1755212345678') then
    raise exception 'an entry with a legacy numeric id was dropped on save';
  end if;
  if not exists (select 1 from goals where household_id = hid
                  and id = '7f3c1e22-aaaa-4bbb-8ccc-1234567890ab'
                  and entry_id = '0d045530-5093-5be3-ab67-498da28b2b3c') then
    raise exception 'a goal with a UUID id (or its linked entry) was dropped on save';
  end if;

  -- ...and each id comes back as the JSON type the client sent. A numeric id
  -- returned as "1755212345678" would break every cross-reference the client
  -- holds as a number.
  got := (load_household() -> 'data');
  if jsonb_typeof((select e -> 'id' from jsonb_array_elements(got -> 'entries') e
                   where e ->> 'id' = '1755212345678')) <> 'number' then
    raise exception 'a legacy numeric id came back as something other than a number';
  end if;
  if jsonb_typeof((select e -> 'id' from jsonb_array_elements(got -> 'entries') e
                   where e ->> 'id' = '0d045530-5093-5be3-ab67-498da28b2b3c')) <> 'string' then
    raise exception 'a UUID id came back as something other than a string';
  end if;
  if got -> 'goals' -> 0 ->> 'entryId' <> '0d045530-5093-5be3-ab67-498da28b2b3c' then
    raise exception 'a goal lost the entry it is linked to: %', got -> 'goals';
  end if;

  -- 6. Deleting the household takes its holidays with it. -------------------
  delete from households where id = hid;
  if exists (select 1 from holidays where household_id = hid)
     or exists (select 1 from holiday_years where household_id = hid) then
    raise exception 'holiday rows outlived their household';
  end if;
  delete from auth.users where id = uid;

  raise notice 'schema round-trip: all checks passed';
end $$;
