-- The per-member daily AI allowance the ai-proxy Edge Function draws on.
--
--   psql -v ON_ERROR_STOP=1 -f supabase/schema.sql
--   psql -v ON_ERROR_STOP=1 -f tests/ai-quota.sql
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  n int;
  checks int := 0;
begin
  insert into auth.users (id, email) values (a, 'quota-a@example.com'), (b, 'quota-b@example.com');
  perform set_config('request.jwt.claim.sub', a::text, true);
  if not ai_take_quota(3) or not ai_take_quota(3) or not ai_take_quota(3) then
    raise exception 'ai-quota: the first three calls under a limit of three were refused';
  end if;
  checks := checks + 1;
  if ai_take_quota(3) then
    raise exception 'ai-quota: a fourth call under a limit of three was allowed';
  end if;
  checks := checks + 1;
  -- Still counted when refused, so persisting does not wear the limit down.
  select calls into n from ai_usage where user_id = a;
  if n <> 4 then raise exception 'ai-quota: expected 4 counted calls, found %', n; end if;
  checks := checks + 1;
  -- One member's use is not another's.
  perform set_config('request.jwt.claim.sub', b::text, true);
  if not ai_take_quota(3) then raise exception 'ai-quota: another member inherited the first one''s count'; end if;
  checks := checks + 1;
  -- Signed out is never within quota.
  perform set_config('request.jwt.claim.sub', '', true);
  if ai_take_quota(1000) then raise exception 'ai-quota: an anonymous call was allowed'; end if;
  checks := checks + 1;
  -- Nobody reads or resets the counter directly.
  execute 'grant select, update, delete on ai_usage to authenticated';
  perform set_config('request.jwt.claim.sub', a::text, true);
  set local role authenticated;
  select count(*) into n from ai_usage;
  delete from ai_usage;
  reset role;
  if n <> 0 then raise exception 'ai-quota: a member can read % usage rows directly', n; end if;
  if (select calls from ai_usage where user_id = a) <> 4 then raise exception 'ai-quota: a member reset their own counter'; end if;
  checks := checks + 1;
  raise notice 'ai-quota: all % checks passed', checks;
end $$;
