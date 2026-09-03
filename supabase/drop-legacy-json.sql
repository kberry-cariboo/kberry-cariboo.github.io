-- Drop the legacy JSON stores, once you have verified the data moved.
--
-- Run this AFTER supabase/schema.sql has run at least once against the
-- database you are dropping from. schema.sql creates the tables and columns
-- that replaced these, and unpacks each blob into them; this file removes the
-- blobs it left behind as a backup. Nothing in the app reads or writes any of
-- them any more.
--
--   psql -v ON_ERROR_STOP=1 -f supabase/drop-legacy-json.sql
--
-- It is deliberately a separate file, and deliberately not run by CI or by the
-- app. Every statement here is irreversible, and until you run it you still
-- have the pre-migration copy of everything — which is the whole point of
-- keeping them through one deploy.
--
-- What goes:
--   household_settings.activity          -> activity_log rows
--   household_settings.debt_data         -> debts rows
--   household_settings.dash_hidden       -> dash_hidden_ids text[]
--   household_settings.deleted_copy_ids  -> deleted_copy_id_list text[]
--   household_settings.rollover          -> rollover_categories text[]
--   entry_overrides.history              -> entry_override_history rows
--   household_data                       -> the pre-normalization blob store,
--                                           already superseded by every table
--                                           in schema.sql

-- ── Refuse to run if anything still looks unmigrated ────────────────────────
-- Each check asks the same question: is there a household whose old blob has
-- something in it and whose new home has nothing? That is what an incomplete
-- migration looks like, and it is the one state in which dropping loses data.
do $$
declare problems text[] := '{}';
begin
  if not exists (select 1 from cf_migrations where name = 'settings_json_sets_to_arrays')
     or not exists (select 1 from cf_migrations where name = 'activity_blob_to_rows')
     or not exists (select 1 from cf_migrations where name = 'override_history_blob_to_rows') then
    raise exception 'schema.sql has not finished migrating this database yet — run it first.';
  end if;

  if exists (
    select 1 from household_settings s
    where jsonb_array_length(coalesce(s.activity, '[]'::jsonb)) > 0
      and not exists (select 1 from activity_log l where l.household_id = s.household_id)
  ) then problems := problems || 'activity'; end if;

  if exists (
    select 1 from household_settings s
    where s.debt_data <> '{}'::jsonb
      and not exists (select 1 from debts t where t.household_id = s.household_id)
  ) then problems := problems || 'debt_data'; end if;

  if exists (
    select 1 from household_settings s
    where s.dash_hidden <> '{}'::jsonb and coalesce(array_length(s.dash_hidden_ids, 1), 0) = 0
      -- A map of nothing but `false` values is legitimately an empty set.
      and exists (select 1 from jsonb_each(s.dash_hidden) x(k, v)
                  where jsonb_typeof(v) <> 'null' and v not in ('false'::jsonb, '0'::jsonb, '""'::jsonb))
  ) then problems := problems || 'dash_hidden'; end if;

  if exists (
    select 1 from household_settings s
    where s.deleted_copy_ids <> '{}'::jsonb and coalesce(array_length(s.deleted_copy_id_list, 1), 0) = 0
      and exists (select 1 from jsonb_each(s.deleted_copy_ids) x(k, v)
                  where jsonb_typeof(v) <> 'null' and v not in ('false'::jsonb, '0'::jsonb, '""'::jsonb))
  ) then problems := problems || 'deleted_copy_ids'; end if;

  if exists (
    select 1 from household_settings s
    where s.rollover <> '{}'::jsonb and coalesce(array_length(s.rollover_categories, 1), 0) = 0
      and exists (select 1 from jsonb_each(s.rollover) x(k, v)
                  where jsonb_typeof(v) <> 'null' and v not in ('false'::jsonb, '0'::jsonb, '""'::jsonb))
  ) then problems := problems || 'rollover'; end if;

  if exists (
    select 1 from entry_overrides v
    where jsonb_array_length(coalesce(v.history, '[]'::jsonb)) > 0
      and not exists (select 1 from entry_override_history h
                      where h.household_id = v.household_id and h.year = v.year
                        and h.occurrence_id = v.occurrence_id)
  ) then problems := problems || 'entry_overrides.history'; end if;

  if array_length(problems, 1) > 0 then
    raise exception 'not dropping: % still holds data with nothing in its new home. Run schema.sql, check, then re-run this.',
      array_to_string(problems, ', ');
  end if;
  raise notice 'every legacy JSON store has a migrated counterpart — dropping.';
end $$;

-- ── Drop ───────────────────────────────────────────────────────────────────
alter table household_settings drop column if exists activity;
alter table household_settings drop column if exists debt_data;
alter table household_settings drop column if exists dash_hidden;
alter table household_settings drop column if exists deleted_copy_ids;
alter table household_settings drop column if exists rollover;
alter table household_settings drop column if exists debts_migrated_at;
alter table entry_overrides drop column if exists history;

-- The pre-normalization blob store. schema.sql's migration block reads it to
-- populate the normalized tables for a household that has never been migrated,
-- so dropping it means that migration can no longer run — which is correct
-- once every household is on the new tables, and wrong before then. The
-- guard above does not cover this one, because a database with no legacy
-- households looks identical to one whose migration never ran; check for
-- yourself first:
--
--   select count(*) from household_data;      -- rows still holding a blob
--   select count(*) from households h
--    where not exists (select 1 from household_settings s
--                       where s.household_id = h.id);   -- never migrated
--
-- Both zero (or the first zero) means this is safe.
drop table if exists household_data;

do $$
begin
  raise notice 'legacy JSON stores dropped. Every value in this database is now a column.';
end $$;
