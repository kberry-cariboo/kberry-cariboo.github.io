-- Schedules the send-notifications Edge Function.
--
-- Run this in the Supabase SQL editor AFTER:
--   1. running schema.sql (which creates push_subscriptions /
--      notification_schedule / notification_sends), and
--   2. deploying the function:
--        supabase functions deploy send-notifications --no-verify-jwt
--        supabase secrets set CRON_SECRET=<your value>
--
-- The shared secret is NOT written into this file. This repository is public,
-- and a secret committed to it stops being a secret the moment it's pushed —
-- so the cron job reads it from Supabase Vault at call time instead. Store it
-- once, by running this line on its own with your value substituted:
--
--     select vault.create_secret('<your CRON_SECRET>', 'cf_cron_secret');
--
-- (To rotate later: select vault.update_secret(id, '<new value>') — find the
-- id with `select id, name from vault.secrets where name = 'cf_cron_secret'` —
-- and re-run `supabase secrets set CRON_SECRET=<new value>`. Both ends have to
-- match or the function returns 403.)
--
-- Why hourly and not daily: each device stores its own IANA timezone and
-- preferred delivery hour, so every hour is somebody's 8am. The function itself
-- decides which subscriptions are actually due on each run, and
-- notification_sends stops anything being delivered twice.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Vault ships enabled on Supabase; tolerate both states rather than aborting
-- the whole script on a permissions error for something already present.
do $$
begin
  create extension if not exists supabase_vault;
exception when others then
  null;
end $$;

do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'cf_cron_secret') then
    raise exception
      'No vault secret named cf_cron_secret. Run: select vault.create_secret(''<your CRON_SECRET>'', ''cf_cron_secret'');';
  end if;
end $$;

-- cron.schedule errors on a duplicate job name, so clear any previous version
-- first — this file is meant to be safe to re-run.
do $$
begin
  perform cron.unschedule('cashflow-send-notifications');
exception when others then
  null;  -- no such job yet
end $$;

select cron.schedule(
  'cashflow-send-notifications',
  '0 * * * *',
  $cron$
    select net.http_post(
      url := 'https://vhwrflyqcubvybolbifl.supabase.co/functions/v1/send-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cf_cron_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    );
  $cron$
);

-- Useful afterwards:
--   select * from cron.job;                                  -- is it scheduled?
--   select * from cron.job_run_details order by start_time desc limit 10;
--   select * from net._http_response order by created desc limit 10;  -- what the function returned
-- A 403 in that last one means the vault secret and the function's CRON_SECRET
-- disagree.
