-- Leaving a household, removing a member, deleting an account.
--
--   psql -v ON_ERROR_STOP=1 -f supabase/schema.sql
--   psql -v ON_ERROR_STOP=1 -f tests/member-lifecycle.sql
do $$
declare
  owner_id uuid := gen_random_uuid();
  member_id uuid := gen_random_uuid();
  third_id uuid := gen_random_uuid();
  solo_id uuid := gen_random_uuid();
  hid uuid;
  solo_hid uuid;
  code text;
  failed boolean;
  checks int := 0;
begin
  insert into auth.users (id, email) values (owner_id, 'lc-owner@example.com'), (member_id, 'lc-member@example.com'),
    (third_id, 'lc-third@example.com'), (solo_id, 'lc-solo@example.com');
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  hid := create_household('Owner');
  perform save_household(jsonb_build_object('entries', '[]'::jsonb, 'schemaVersion', 999), null);
  code := create_invite();
  perform set_config('request.jwt.claim.sub', member_id::text, true);
  perform join_household(code, 'Member');
  perform save_my_preferences(jsonb_build_object('darkMode', true));
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  code := create_invite();
  perform set_config('request.jwt.claim.sub', third_id::text, true);
  perform join_household(code, 'Third');

  -- ── Removing ──────────────────────────────────────────────────────────────
  perform set_config('request.jwt.claim.sub', member_id::text, true);
  failed := false;
  begin perform remove_member(third_id); exception when insufficient_privilege then failed := true; end;
  if not failed then raise exception 'member-lifecycle: a non-owner removed someone'; end if;
  checks := checks + 1;

  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  failed := false;
  begin perform remove_member(owner_id); exception when others then failed := true; end;
  if not failed then raise exception 'member-lifecycle: an owner removed themselves with remove_member'; end if;
  checks := checks + 1;

  perform remove_member(third_id);
  if exists (select 1 from household_members where user_id = third_id) then
    raise exception 'member-lifecycle: the owner could not remove a member';
  end if;
  checks := checks + 1;

  -- ── Leaving ───────────────────────────────────────────────────────────────
  -- The only owner cannot leave while others remain...
  failed := false;
  begin perform leave_household(); exception when insufficient_privilege then failed := true; end;
  if not failed then raise exception 'member-lifecycle: the only owner left, orphaning the household'; end if;
  checks := checks + 1;

  -- ...a member can, and takes their own preferences with them.
  perform set_config('request.jwt.claim.sub', member_id::text, true);
  code := leave_household();
  if code <> 'left' then raise exception 'member-lifecycle: a member could not leave'; end if;
  if exists (select 1 from household_members where user_id = member_id)
     or exists (select 1 from member_preferences where user_id = member_id) then
    raise exception 'member-lifecycle: leaving left the membership or preferences behind';
  end if;
  if not exists (select 1 from households where id = hid) then
    raise exception 'member-lifecycle: a member leaving deleted the household';
  end if;
  checks := checks + 1;

  -- The last one out takes the household with them.
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  -- Two statements, not one: an EXISTS in the same expression as the call
  -- reads the snapshot from before the call's delete.
  code := leave_household();
  if code <> 'deleted' or exists (select 1 from households where id = hid)
     or exists (select 1 from household_settings where household_id = hid) then
    raise exception 'member-lifecycle: the last member leaving did not delete the household and its data';
  end if;
  checks := checks + 1;

  -- ── Deleting an account ───────────────────────────────────────────────────
  perform set_config('request.jwt.claim.sub', solo_id::text, true);
  solo_hid := create_household('Solo');
  perform save_household(jsonb_build_object('entries', '[]'::jsonb, 'schemaVersion', 999), null);
  perform create_invite(); -- a reference to the user that does not cascade
  perform delete_my_account();
  if exists (select 1 from auth.users where id = solo_id) then
    raise exception 'member-lifecycle: the account still exists';
  end if;
  if exists (select 1 from households where id = solo_hid) then
    raise exception 'member-lifecycle: deleting the only member''s account left their household behind';
  end if;
  checks := checks + 1;

  raise notice 'member-lifecycle: all % checks passed', checks;
end $$;
