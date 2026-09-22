-- Inviting someone into a household, end to end.
--
-- This broke in production while passing every check here. create_invite()
-- drew its code from gen_random_bytes(), which lives in pgcrypto, and the
-- function declared `set search_path = public`. On a bare Postgres the
-- extension lands in public and the call resolves. On a Supabase project
-- pgcrypto is already installed in the `extensions` schema, so `create
-- extension if not exists pgcrypto` does nothing — the extension exists, just
-- not where the function can see it.
--
-- Nothing failed at deploy time. The schema loaded, the function compiled,
-- and it broke only when somebody pressed the button: "function
-- gen_random_bytes(integer) does not exist".
--
-- Putting `extensions` on the search_path would fix that one call. What is
-- here instead removes the dependency: the code comes from gen_random_uuid(),
-- core from PG13 on and a CSPRNG, so there is no extension left to be
-- reachable or not. CI runs this file against three databases — pgcrypto in
-- public, pgcrypto in `extensions`, and no pgcrypto at all. The third is the
-- one that proves it, and reinstating gen_random_bytes turns the last two red
-- with the production error verbatim.
--
--   psql -v ON_ERROR_STOP=1 -f supabase/schema.sql
--   psql -v ON_ERROR_STOP=1 -f tests/invite-flow.sql
do $$
declare
  owner_id uuid := gen_random_uuid();
  joiner_id uuid := gen_random_uuid();
  stranger_id uuid := gen_random_uuid();
  hid uuid;
  invite_code text;
  joined uuid;
  drawn text[];
  failed boolean;
  checks int := 0;
begin
  insert into auth.users (id, email) values
    (owner_id, 'owner@example.com'), (joiner_id, 'joiner@example.com'), (stranger_id, 'stranger@example.com');

  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  hid := create_household('Owner');

  -- ── The code itself ───────────────────────────────────────────────────────
  invite_code := create_invite();
  if invite_code is null or length(invite_code) <> 8 then
    raise exception 'invite-flow: create_invite returned %, not an 8-character code', coalesce(invite_code, '<null>');
  end if;
  checks := checks + 1;
  -- The alphabet drops I, O, 0 and 1 so a code survives being read aloud or
  -- typed off a photograph.
  if invite_code ~ '[IO01]' then
    raise exception 'invite-flow: code % contains a character the alphabet excludes', invite_code;
  end if;
  checks := checks + 1;
  if invite_code <> upper(invite_code) then
    raise exception 'invite-flow: code % is not upper case, and join_household upper-cases what it is given', invite_code;
  end if;
  checks := checks + 1;
  -- Two codes in a row must differ, or the CSPRNG is not being reached.
  if create_invite() = invite_code then
    raise exception 'invite-flow: two invites produced the same code';
  end if;
  checks := checks + 1;
  -- Every character position has to carry randomness, which is the part the
  -- table cannot check for itself. Outright collisions are already impossible
  -- to miss — `code` is the primary key, so a repeat aborts the insert — but a
  -- generator that reuses a byte offset, or masks one to a constant, still
  -- hands out codes that are all distinct and quietly worth far less than the
  -- ~40 bits on the label. So: 200 draws, and no position may come back the
  -- same character every time.
  drawn := '{}';
  for i in 1..200 loop
    drawn := drawn || create_invite();
  end loop;
  for i in 1..8 loop
    if (select count(distinct substr(x, i, 1)) from unnest(drawn) x) < 2 then
      raise exception 'invite-flow: character % is always "%" across 200 codes — that position carries no randomness',
        i, (select distinct substr(x, i, 1) from unnest(drawn) x);
    end if;
  end loop;
  checks := checks + 1;

  -- ── Joining ───────────────────────────────────────────────────────────────
  perform set_config('request.jwt.claim.sub', joiner_id::text, true);
  joined := join_household(invite_code, 'Joiner');
  if joined is distinct from hid then
    raise exception 'invite-flow: joined % but the invite was for %', joined, hid;
  end if;
  checks := checks + 1;
  if (select count(*) from household_members where household_id = hid) <> 2 then
    raise exception 'invite-flow: the household has % members after a join, not 2',
      (select count(*) from household_members where household_id = hid);
  end if;
  checks := checks + 1;
  -- Typed in lower case, as anyone reading it off a screen might.
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  invite_code := create_invite();
  perform set_config('request.jwt.claim.sub', stranger_id::text, true);
  if join_household(lower(invite_code), 'Stranger') is distinct from hid then
    raise exception 'invite-flow: a lower-case code was refused';
  end if;
  checks := checks + 1;

  -- ── And the refusals ──────────────────────────────────────────────────────
  failed := false;
  begin
    perform join_household(invite_code, 'Stranger again');
  exception when others then failed := true;
  end;
  if not failed then
    raise exception 'invite-flow: a member joined a second time';
  end if;
  checks := checks + 1;

  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  failed := false;
  begin
    perform join_household('ZZZZZZZZ', 'Nobody');
  exception when others then failed := true;
  end;
  if not failed then
    raise exception 'invite-flow: a made-up code was accepted';
  end if;
  checks := checks + 1;

  -- An expired invite is not a usable one.
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  invite_code := create_invite();
  -- The local variable is invite_code, not code: a plpgsql variable sharing a
  -- name with a column of the table being updated is ambiguous on both sides
  -- of the comparison, and Postgres refuses it rather than guessing.
  update household_invites set expires_at = now() - interval '1 day'
    where household_invites.code = invite_code;
  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  failed := false;
  begin
    perform join_household(invite_code, 'Too late');
  exception when others then failed := true;
  end;
  if not failed then
    raise exception 'invite-flow: an expired code was accepted';
  end if;
  checks := checks + 1;

  raise notice 'invite-flow: all % checks passed', checks;
end $$;
