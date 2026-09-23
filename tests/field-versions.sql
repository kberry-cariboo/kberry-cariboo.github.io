-- Per-field versions and save_household_fields: two members editing different
-- fields never conflict; the same field, written since you last saw it, does.
--
--   psql -v ON_ERROR_STOP=1 -f supabase/schema.sql
--   psql -v ON_ERROR_STOP=1 -f tests/field-versions.sql
do $$
declare
  a_id uuid := gen_random_uuid();
  b_id uuid := gen_random_uuid();
  v_id uuid := gen_random_uuid();
  hid uuid;
  code text;
  res jsonb;
  base jsonb;
  stale jsonb;
  failed boolean;
  checks int := 0;
begin
  insert into auth.users (id, email) values (a_id, 'fv-a@example.com'), (b_id, 'fv-b@example.com'), (v_id, 'fv-v@example.com');
  perform set_config('request.jwt.claim.sub', a_id::text, true);
  hid := create_household('A');
  code := create_invite();
  perform set_config('request.jwt.claim.sub', b_id::text, true);
  perform join_household(code, 'B');
  perform set_config('request.jwt.claim.sub', a_id::text, true);
  code := create_invite();
  perform set_config('request.jwt.claim.sub', v_id::text, true);
  perform join_household(code, 'Viewer');
  -- Roles are changed by an owner (a member cannot change their own).
  perform set_config('request.jwt.claim.sub', a_id::text, true);
  update household_members set role = 'viewer' where user_id = v_id;

  -- A first save needs no base: nothing has a version yet.
  res := save_household_fields(jsonb_build_object(
    'entries', jsonb_build_array(jsonb_build_object('id', 'e1', 'desc', 'Rent', 'type', 'expense', 'amount', 100000, 'category', 'Housing', 'startDate', '2026-01-01')),
    'goals', '[]'::jsonb, 'schemaVersion', 999), '{}'::jsonb);
  if res ? 'conflict' or not (res->'versions' ? 'entries') or not (res->'versions' ? 'goals') then
    raise exception 'field-versions: a first save did not stamp its fields: %', res;
  end if;
  checks := checks + 1;

  -- load_household hands out the same versions.
  base := (load_household(false))->'versions';
  if base is distinct from res->'versions' then
    raise exception 'field-versions: load_household versions % differ from the save''s %', base, res->'versions';
  end if;
  checks := checks + 1;

  -- B, working from that load, changes the goals...
  perform set_config('request.jwt.claim.sub', b_id::text, true);
  res := save_household_fields(jsonb_build_object(
    'goals', jsonb_build_array(jsonb_build_object('id', 'g1', 'name', 'Roof', 'target', 500000, 'saved', 0, 'monthly', 10000)),
    'schemaVersion', 999), jsonb_build_object('goals', base->'goals'));
  if res ? 'conflict' then raise exception 'field-versions: B''s goals save conflicted: %', res; end if;
  if (res->'versions'->>'entries') is distinct from (base->>'entries') then
    raise exception 'field-versions: saving goals moved the entries version';
  end if;
  checks := checks + 1;

  -- ...and A, from the same load, changes an entry. Different field: no conflict.
  perform set_config('request.jwt.claim.sub', a_id::text, true);
  res := save_household_fields(jsonb_build_object(
    'entries', jsonb_build_array(jsonb_build_object('id', 'e1', 'desc', 'Rent', 'type', 'expense', 'amount', 110000, 'category', 'Housing', 'startDate', '2026-01-01')),
    'schemaVersion', 999), jsonb_build_object('entries', base->'entries'));
  if res ? 'conflict' then raise exception 'field-versions: edits to different fields conflicted: %', res; end if;
  if not exists (select 1 from goals where household_id = hid and id = 'g1') then
    raise exception 'field-versions: A''s save lost B''s goal';
  end if;
  checks := checks + 1;

  -- B now edits the entries from the stale load: A wrote them since. Refused,
  -- the answer names only the clashing field, and nothing is written — not even
  -- the categories that were fine.
  perform set_config('request.jwt.claim.sub', b_id::text, true);
  stale := jsonb_build_object('entries', base->'entries', 'categories', null);
  res := save_household_fields(jsonb_build_object(
    'entries', jsonb_build_array(jsonb_build_object('id', 'e1', 'desc', 'Rent', 'type', 'expense', 'amount', 1, 'category', 'Housing', 'startDate', '2026-01-01')),
    'categories', '["Housing","Food"]'::jsonb,
    'schemaVersion', 999), stale);
  if not (res ? 'conflict') or res->'conflict' <> '["entries"]'::jsonb then
    raise exception 'field-versions: a stale entries save was not refused as exactly [entries]: %', res;
  end if;
  if (select amount from entries where household_id = hid and id = 'e1') <> 110000 then
    raise exception 'field-versions: a refused save still wrote entries';
  end if;
  if exists (select 1 from categories where household_id = hid and name = 'Food') then
    raise exception 'field-versions: a refused save still wrote categories';
  end if;
  checks := checks + 1;

  -- With the current versions, the same save goes through.
  res := save_household_fields(jsonb_build_object(
    'entries', jsonb_build_array(jsonb_build_object('id', 'e1', 'desc', 'Rent', 'type', 'expense', 'amount', 1, 'category', 'Housing', 'startDate', '2026-01-01')),
    'categories', '["Housing","Food"]'::jsonb,
    'schemaVersion', 999), res->'versions');
  if res ? 'conflict' then raise exception 'field-versions: a save with current versions conflicted: %', res; end if;
  if (select amount from entries where household_id = hid and id = 'e1') <> 1 then
    raise exception 'field-versions: an accepted save did not write';
  end if;
  checks := checks + 1;

  -- The older whole-household save stamps what it writes, so a new client sees
  -- an old tab's save as a change.
  base := (load_household(false))->'versions';
  perform pg_sleep(0.01);
  perform save_household(jsonb_build_object('categories', '["Housing"]'::jsonb, 'schemaVersion', 999), null);
  if ((load_household(false))->'versions'->>'categories') = (base->>'categories') then
    raise exception 'field-versions: save_household did not stamp the field it wrote';
  end if;
  if ((load_household(false))->'versions'->>'entries') is distinct from (base->>'entries') then
    raise exception 'field-versions: save_household stamped a field it did not write';
  end if;
  checks := checks + 1;

  -- A viewer is refused, as by every other save.
  perform set_config('request.jwt.claim.sub', v_id::text, true);
  failed := false;
  begin
    perform save_household_fields(jsonb_build_object('goals', '[]'::jsonb), '{}'::jsonb);
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'field-versions: a viewer saved'; end if;
  checks := checks + 1;

  -- A field this database does not know is still refused outright.
  perform set_config('request.jwt.claim.sub', a_id::text, true);
  failed := false;
  begin
    perform save_household_fields(jsonb_build_object('noSuchField', 1), '{}'::jsonb);
  exception when others then failed := true;
  end;
  if not failed then raise exception 'field-versions: an unknown field was accepted'; end if;
  checks := checks + 1;

  -- Deleting an account keeps the versions it stamped, without the reference.
  perform set_config('request.jwt.claim.sub', b_id::text, true);
  perform delete_my_account();
  if exists (select 1 from household_field_versions where updated_by = b_id) then
    raise exception 'field-versions: a deleted account is still named on a version';
  end if;
  if not exists (select 1 from household_field_versions where household_id = hid and field = 'goals') then
    raise exception 'field-versions: deleting an account removed a version';
  end if;
  checks := checks + 1;

  raise notice 'field-versions: all % checks passed', checks;
end $$;
