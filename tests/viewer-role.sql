-- A household member who can see everything and change nothing.
--
-- This is an access-control boundary, and the two ways to get it wrong are not
-- symmetric. Too strict locks someone out of their own budget, which is
-- annoying and obvious. Too loose ships a "view-only" member who can still
-- write, which is worse precisely because the interface says otherwise — the
-- person trusting the label is the one who finds out.
--
-- So this asserts both halves against a real database, as the caller, rather
-- than reading the policies and believing them: the viewer is refused on every
-- path that writes, and is refused nothing that reads.
--
--   psql -v ON_ERROR_STOP=1 -f supabase/schema.sql
--   psql -v ON_ERROR_STOP=1 -f tests/viewer-role.sql
do $$
declare
  owner_id uuid := gen_random_uuid();
  viewer_id uuid := gen_random_uuid();
  hid uuid;
  loaded jsonb;
  failed boolean;
  checks int := 0;
begin
  -- An owner with a household and one entry in it.
  insert into auth.users (id, email) values (owner_id, 'owner@example.com');
  insert into auth.users (id, email) values (viewer_id, 'viewer@example.com');
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  hid := create_household('Owner');
  perform save_household(jsonb_build_object(
    'entries', jsonb_build_array(jsonb_build_object(
      'id', 'e1', 'desc', 'Rent', 'type', 'expense', 'amount', 165000,
      'category', 'Housing', 'startDate', '2026-01-01', 'repeats', true)),
    'schemaVersion', 999));

  -- The viewer joins, and is then made view-only.
  insert into household_members (household_id, user_id, full_name, role)
    values (hid, viewer_id, 'Viewer', 'viewer');

  -- ── Reading: everything, exactly as anyone else ───────────────────────────
  perform set_config('request.jwt.claim.sub', viewer_id::text, true);
  -- load_household() wraps the payload: { data, receipts }. Reading the wrong
  -- level does not error, it yields NULL — and `jsonb_array_length(NULL) <> 1`
  -- is NULL, not true, so the guard below silently passed on nothing at all
  -- the first time this was written. Hence the typeof assertion.
  loaded := (load_household())->'data';
  if loaded is null then
    raise exception 'viewer-role: a viewer could not load the household at all';
  end if;
  checks := checks + 1;
  if jsonb_typeof(loaded->'entries') is distinct from 'array' then
    raise exception 'viewer-role: a viewer got no entries array back (typeof %) — nothing below this would have been tested',
      coalesce(jsonb_typeof(loaded->'entries'), 'null');
  end if;
  checks := checks + 1;
  if jsonb_array_length(loaded->'entries') <> 1 then
    raise exception 'viewer-role: a viewer sees % entries, not the 1 that exists — read access was narrowed, and it should not have been',
      jsonb_array_length(loaded->'entries');
  end if;
  checks := checks + 1;
  if (loaded->'entries'->0->>'desc') is distinct from 'Rent' then
    raise exception 'viewer-role: the entry a viewer reads back is not the one that was saved';
  end if;
  checks := checks + 1;

  -- ── Writing: refused, on every path ───────────────────────────────────────
  failed := false;
  begin
    perform save_household(jsonb_build_object('entries', '[]'::jsonb, 'schemaVersion', 999));
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then
    raise exception 'viewer-role: a viewer SAVED the household — view-only is not enforced';
  end if;
  checks := checks + 1;

  -- The conflict-checked save is a second door into the same room.
  failed := false;
  begin
    perform save_household(jsonb_build_object('entries', '[]'::jsonb, 'schemaVersion', 999), null);
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then
    raise exception 'viewer-role: a viewer saved through the conflict-checked path';
  end if;
  checks := checks + 1;

  -- Receipts are budget data too.
  failed := false;
  begin
    perform put_receipt('override:2026:e1-2026-0-1', 'image/png', 'AAAA');
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then
    raise exception 'viewer-role: a viewer attached a receipt';
  end if;
  checks := checks + 1;

  failed := false;
  begin
    perform delete_receipt('override:2026:e1-2026-0-1');
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then
    raise exception 'viewer-role: a viewer deleted a receipt';
  end if;
  checks := checks + 1;

  -- And nothing the viewer tried left a mark.
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  loaded := (load_household())->'data';
  if jsonb_array_length(loaded->'entries') <> 1 then
    raise exception 'viewer-role: the household changed despite every write being refused';
  end if;
  checks := checks + 1;

  -- ── An ordinary member is unaffected ──────────────────────────────────────
  -- The role defaults to 'member', and a household from before this existed
  -- has no viewers in it. Writing must carry on working.
  update household_members set role = 'member' where user_id = viewer_id;
  perform set_config('request.jwt.claim.sub', viewer_id::text, true);
  perform save_household(jsonb_build_object(
    'entries', jsonb_build_array(jsonb_build_object(
      'id', 'e2', 'desc', 'Hydro', 'type', 'expense', 'amount', 11000,
      'category', 'Utilities', 'startDate', '2026-01-12', 'repeats', true)),
    'schemaVersion', 999));
  loaded := (load_household())->'data';
  if (loaded->'entries'->0->>'desc') is distinct from 'Hydro' then
    raise exception 'viewer-role: an ordinary member was blocked from writing';
  end if;
  checks := checks + 1;

  raise notice 'viewer-role: all % checks passed', checks;
end $$;
