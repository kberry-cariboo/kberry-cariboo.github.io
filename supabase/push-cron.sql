-- Schedules the send-notifications Edge Function.
--
-- Run this in the Supabase SQL editor AFTER:
--   1. running schema.sql (which creates push_subscriptions /
--      notification_schedule / notification_sends), and
--   2. deploying the function:
--        supabase functions deploy send-notifications --no-verify-jwt
--
-- Replace <CRON-SECRET> below with the same value you set as the function's
-- CRON_SECRET secret:
--        supabase secrets set CRON_SECRET=$(openssl rand -hex 32)
--
-- Why hourly and not daily: each device stores its own IANA timezone and
-- preferred delivery hour, so every hour is somebody's 8am. The function itself
-- decides which subscriptions are actually due on each run, and
-- notification_sends stops anything being delivered twice.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- cron.schedule errors on a duplicate job name, so clear any previous version
-- first — this file is meant to be safe to re-run after editing the secret.
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
        'x-cron-secret', '<CRON-SECRET>'
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
