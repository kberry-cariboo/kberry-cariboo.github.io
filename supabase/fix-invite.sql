-- CashFlow Budget — fixes "function gen_random_bytes(integer) does not exist"
-- when you generate a household invite code.
--
-- Paste this into the Supabase SQL editor (your project → SQL Editor → New
-- query) and run it. It replaces one function and touches no data.

create or replace function create_invite()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
  code text;
begin
  select household_id into hid from household_members
    where user_id = auth.uid() and not disabled limit 1;
  if hid is null then
    raise exception 'You must belong to a household first.';
  end if;
  -- A view-only member may not invite: the newcomer is seated as a writer.
  if not is_household_writer(hid) then
    raise exception 'View-only members cannot invite people to the household.'
      using errcode = '42501';
  end if;
  -- Randomness from gen_random_uuid(): core Postgres, a CSPRNG, and no
  -- extension that has to be installed in the right schema to be reachable.
  -- Byte positions 6 and 8 are skipped — in a v4 UUID they carry the version
  -- and variant bits rather than randomness.
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + (get_byte(u, b) % 32), 1), '' order by b)
    into code
    from (select uuid_send(gen_random_uuid()) as u) g, unnest(array[0,1,2,3,4,5,7,9]) as b;
  insert into household_invites(code, household_id, created_by) values (code, hid, auth.uid());
  return code;
end;
$$;
