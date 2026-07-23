-- CashFlow Budget — Supabase schema (normalized)
--
-- Run this once in your Supabase project's SQL editor (Dashboard -> SQL Editor ->
-- New query -> paste this whole file -> Run). Safe to re-run: every statement is
-- idempotent (create-if-not-exists / drop-and-recreate policies & functions), and
-- the data migration at the bottom only runs for households that haven't been
-- migrated yet.
--
-- Model: a "household" is a shared budget. Each real person signs in with their own
-- Supabase account (email + password) and joins a household either by creating one
-- (first-time sign-up) or by entering an invite code from an existing member. All
-- household members can read and write the same shared budget data.
--
-- Storage: budget data lives in normalized tables (entries, entry_overrides,
-- categories, year_configs, budget_targets, templates, completed_occurrences,
-- goals, household_settings) instead of the old single-JSONB-blob household_data
-- table. Receipt images are stored as binary blobs (bytea) in the receipts table.
-- The app reads/writes through the load_household / save_household /
-- put_receipt / delete_receipt RPCs, which run as security definer and scope
-- everything to the calling user's household.
--
-- Migration: the DO block at the end copies each household's old household_data
-- JSONB blob into the normalized tables (including extracting inline base64
-- receipt images into the receipts table). It only runs for households that have
-- blob data but no household_settings row yet, so re-running is safe. The old
-- household_data table is kept untouched as a read-only backup — once you've
-- verified your data in the app you may drop it.
--
-- Security: Row Level Security (RLS) is the actual access boundary — the anon key
-- shipped in the app's source is not a secret, it just identifies your project.
-- Nobody can read/write another household's data because every policy and RPC
-- below checks the caller is a member of the household they're touching.

create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My Household',
  created_at timestamptz not null default now()
);

create table if not exists household_members (
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null default '',
  disabled boolean not null default false,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table if not exists household_invites (
  code text primary key,
  household_id uuid not null references households(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_by uuid references auth.users(id),
  used_at timestamptz
);

-- LEGACY: the old single-JSONB-blob store. No longer written or read by the app;
-- kept only as the migration source and as a pre-migration backup. Drop it once
-- you've verified your data migrated correctly:  drop table household_data;
create table if not exists household_data (
  household_id uuid primary key references households(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  schema_version int not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- Normalized budget tables ----------------------------------------------------
--
-- Money columns (app schema v8+, round-9 AR5): the client stores every
-- amount as integer cents, so these numeric(14,2) columns always hold whole
-- numbers (165000, never 1650.00) despite the 2-decimal scale — that's just
-- headroom, not a unit hint. A row written by a pre-v8 client is still
-- dollars; cf_apply_household_payload passes values through untouched
-- either way, and the client upgrades old data on load by checking
-- household_settings.schema_version (see centsifyHouseholdPayload in
-- household-sync.js).

-- One row per register entry (a one-off or recurring income/expense).
create table if not exists entries (
  household_id uuid not null references households(id) on delete cascade,
  id bigint not null,                       -- client-generated (Date.now())
  sort_order int not null default 0,
  description text not null default '',
  type text not null default 'expense' check (type in ('income', 'expense')),
  amount numeric(14,2) not null default 0,
  start_date date not null,
  repeats boolean not null default false,
  recur_every int not null default 1,
  recur_unit text not null default 'month' check (recur_unit in ('day','week','month','year','semimonth')),
  recur_days int[] not null default '{}',   -- weekdays (0-6) for weekly schedules
  recur_end date,                           -- null = ongoing
  category text not null default 'Uncategorized',
  notes text not null default '',
  monthly_amounts numeric[],                -- 12 per-month amounts, or null
  created_by uuid,                          -- auth user who created it (null for legacy rows)
  primary key (household_id, id)
);

-- Per-occurrence edits of a recurring entry ("this date only").
-- occurrence_id format: '<entryId>-<year>-<month0>-<day>'.
create table if not exists entry_overrides (
  household_id uuid not null references households(id) on delete cascade,
  year int not null,
  occurrence_id text not null,
  description text,
  amount numeric(14,2),
  day int,
  notes text,
  saved_at timestamptz,
  history jsonb not null default '[]'::jsonb,
  primary key (household_id, year, occurrence_id)
);

create table if not exists categories (
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  color text,
  sort_order int not null default 0,
  primary key (household_id, name)
);

create table if not exists year_configs (
  household_id uuid not null references households(id) on delete cascade,
  year int not null,
  opening_balance numeric(14,2) not null default 0,
  primary key (household_id, year)
);

-- Monthly budget target per category ("2026:0" keys in the old blob).
create table if not exists budget_targets (
  household_id uuid not null references households(id) on delete cascade,
  year int not null,
  month int not null check (month between 0 and 11),
  category text not null,
  amount numeric(14,2) not null default 0,
  primary key (household_id, year, month, category)
);

create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  sort_order int not null default 0,
  description text not null default '',
  type text not null default 'expense' check (type in ('income', 'expense')),
  amount numeric(14,2) not null default 0,
  category text not null default '',
  repeats boolean not null default false,
  recur_every int not null default 1,
  recur_unit text not null default 'month',
  recur_days int[] not null default '{}',
  notes text not null default ''
);

-- Occurrences ticked off as paid/done. occurrence_id as in entry_overrides.
create table if not exists completed_occurrences (
  household_id uuid not null references households(id) on delete cascade,
  occurrence_id text not null,
  completed_at timestamptz not null default now(),
  primary key (household_id, occurrence_id)
);

create table if not exists goals (
  household_id uuid not null references households(id) on delete cascade,
  id bigint not null,                       -- client-generated (Date.now())
  sort_order int not null default 0,
  name text not null default '',
  target numeric(14,2) not null default 0,
  saved numeric(14,2) not null default 0,
  monthly numeric(14,2) not null default 0,
  target_date date,
  entry_id bigint,                          -- linked "monthly contribution" entry
  payout_entry_id bigint,                   -- linked "payout" expense entry
  created_at timestamptz,
  primary key (household_id, id)
);

-- One row per household: scalar preferences that used to ride along in the blob.
create table if not exists household_settings (
  household_id uuid primary key references households(id) on delete cascade,
  active_year int,
  alert_threshold numeric(14,2),
  dark_mode boolean,
  forecast_horizon int,
  ai_api_key text,
  col_order text[] not null default '{}',
  reg_filter text,
  reg_filter_cats text[] not null default '{}',
  reg_filter_scheds text[] not null default '{}',
  reg_filter_status text[] not null default '{}',
  dash_hidden jsonb not null default '{}'::jsonb,
  dash_order text[] not null default '{}',
  schema_version int,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- Receipt images, stored as binary blobs in the database. Receipts are strictly
-- per-occurrence — each dated instance of a (possibly repeating) entry has its
-- own receipt slot:
--   'override:<year>:<occurrenceId>'     — the only form the app writes
-- ('entry:<entryId>' keys appear transiently while migrating legacy blob data
--  and are re-keyed to the entry's start-date occurrence by the migration
--  blocks at the bottom of this file.)
create table if not exists receipts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  owner_key text not null,
  mime text not null default 'image/jpeg',
  data bytea not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, owner_key)
);

alter table households enable row level security;
alter table household_members enable row level security;
alter table household_invites enable row level security;
alter table household_data enable row level security;
alter table entries enable row level security;
alter table entry_overrides enable row level security;
alter table categories enable row level security;
alter table year_configs enable row level security;
alter table budget_targets enable row level security;
alter table templates enable row level security;
alter table completed_occurrences enable row level security;
alter table goals enable row level security;
alter table household_settings enable row level security;
alter table receipts enable row level security;

-- Helper: is the calling user a member of household `hid`?
-- security definer + a fixed search_path so it can be used inside RLS policies
-- (which run as the querying role) without those policies needing direct
-- select access to household_members themselves.
create or replace function is_household_member(hid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(
    select 1 from household_members m
    where m.household_id = hid and m.user_id = auth.uid() and not m.disabled
  );
$$;

create or replace function is_household_owner(hid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(
    select 1 from household_members m
    where m.household_id = hid and m.user_id = auth.uid() and m.role = 'owner' and not m.disabled
  );
$$;

drop policy if exists "read own household" on households;
create policy "read own household" on households
  for select using (is_household_member(id));

drop policy if exists "read household members" on household_members;
create policy "read household members" on household_members
  for select using (is_household_member(household_id));

drop policy if exists "update own member row" on household_members;
create policy "update own member row" on household_members
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "owner can update any member" on household_members;
create policy "owner can update any member" on household_members
  for update using (is_household_owner(household_id)) with check (is_household_owner(household_id));

-- "update own member row" above lets a member update their own row's columns
-- with no restriction, which would otherwise let a disabled member simply
-- flip their own `disabled` flag back to false (or self-promote `role` to
-- 'owner') via a direct client update. RLS policies can't compare a row's
-- old vs. new values on their own, so a trigger enforces it: only an owner
-- (already permitted via the sibling policy above) may change these columns.
create or replace function enforce_member_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_household_owner(new.household_id)
     and (new.disabled is distinct from old.disabled or new.role is distinct from old.role) then
    raise exception 'Only a household owner can change role or disabled status.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_member_self_update on household_members;
create trigger trg_enforce_member_self_update
  before update on household_members
  for each row execute function enforce_member_self_update();

-- Legacy blob: readable (so you can inspect the pre-migration backup) but no
-- longer writable — the app now writes only to the normalized tables.
drop policy if exists "read household data" on household_data;
create policy "read household data" on household_data
  for select using (is_household_member(household_id));
drop policy if exists "update household data" on household_data;
drop policy if exists "insert household data" on household_data;

-- Normalized tables: members can read their household's rows directly.
-- All writes go through the security-definer RPCs below, which keeps every
-- save atomic (one transaction across all tables).
drop policy if exists "member read entries" on entries;
create policy "member read entries" on entries
  for select using (is_household_member(household_id));

drop policy if exists "member read entry_overrides" on entry_overrides;
create policy "member read entry_overrides" on entry_overrides
  for select using (is_household_member(household_id));

drop policy if exists "member read categories" on categories;
create policy "member read categories" on categories
  for select using (is_household_member(household_id));

drop policy if exists "member read year_configs" on year_configs;
create policy "member read year_configs" on year_configs
  for select using (is_household_member(household_id));

drop policy if exists "member read budget_targets" on budget_targets;
create policy "member read budget_targets" on budget_targets
  for select using (is_household_member(household_id));

drop policy if exists "member read templates" on templates;
create policy "member read templates" on templates
  for select using (is_household_member(household_id));

drop policy if exists "member read completed_occurrences" on completed_occurrences;
create policy "member read completed_occurrences" on completed_occurrences
  for select using (is_household_member(household_id));

drop policy if exists "member read goals" on goals;
create policy "member read goals" on goals
  for select using (is_household_member(household_id));

drop policy if exists "member read household_settings" on household_settings;
create policy "member read household_settings" on household_settings
  for select using (is_household_member(household_id));

drop policy if exists "member read receipts" on receipts;
create policy "member read receipts" on receipts
  for select using (is_household_member(household_id));

-- Invites: members can see invites for their own household (to display
-- pending/used codes); creation and redemption go through the RPCs below,
-- which run as security definer so a brand-new member (not yet in the
-- household) can redeem a code without needing broader table access.
drop policy if exists "read own household invites" on household_invites;
create policy "read own household invites" on household_invites
  for select using (is_household_member(household_id));

-- Safe-cast helpers ------------------------------------------------------------
-- The old blob was written by many app versions; these swallow malformed values
-- instead of aborting the whole migration/save. Internal only (not API surface).

create or replace function cf_num(t text, fallback numeric default null)
returns numeric language plpgsql immutable as $$
begin
  return t::numeric;
exception when others then
  return fallback;
end $$;

create or replace function cf_int(t text, fallback int default null)
returns int language plpgsql immutable as $$
begin
  return round(t::numeric)::int;
exception when others then
  return fallback;
end $$;

create or replace function cf_bigint(t text, fallback bigint default null)
returns bigint language plpgsql immutable as $$
begin
  return round(t::numeric)::bigint;
exception when others then
  return fallback;
end $$;

create or replace function cf_bool(t text, fallback boolean default null)
returns boolean language plpgsql immutable as $$
begin
  return t::boolean;
exception when others then
  return fallback;
end $$;

create or replace function cf_date(t text)
returns date language plpgsql immutable as $$
begin
  return nullif(t, '')::date;
exception when others then
  return null;
end $$;

create or replace function cf_ts(t text)
returns timestamptz language plpgsql immutable as $$
begin
  return nullif(t, '')::timestamptz;
exception when others then
  return null;
end $$;

create or replace function cf_text_array(j jsonb)
returns text[] language sql immutable as $$
  select coalesce(
    (select array_agg(x.v order by x.o)
       from jsonb_array_elements_text(
              case when jsonb_typeof(j) = 'array' then j else '[]'::jsonb end
            ) with ordinality x(v, o)),
    '{}'::text[]
  );
$$;

create or replace function cf_int_array(j jsonb)
returns int[] language sql immutable as $$
  select coalesce(
    (select array_agg(cf_int(x.v, 0) order by x.o)
       from jsonb_array_elements_text(
              case when jsonb_typeof(j) = 'array' then j else '[]'::jsonb end
            ) with ordinality x(v, o)),
    '{}'::int[]
  );
$$;

create or replace function cf_num_array(j jsonb)
returns numeric[] language sql immutable as $$
  select case when jsonb_typeof(j) = 'array' then
    (select coalesce(array_agg(cf_num(x.v, 0) order by x.o), '{}'::numeric[])
       from jsonb_array_elements_text(j) with ordinality x(v, o))
  end;
$$;

-- Decompose a full payload (the app's in-memory shape, or the legacy blob) into
-- the normalized tables. Each section only runs when its key is present, so a
-- legacy blob missing newer keys never wipes anything it doesn't know about.
-- Inline base64 `attachment` data URLs (present in legacy blobs and backups)
-- are extracted into the receipts table as binary blobs; normal app saves strip
-- attachments client-side and manage receipts through put_receipt/delete_receipt.
create or replace function cf_apply_household_payload(hid uuid, d jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if d is null or jsonb_typeof(d) <> 'object' then
    raise exception 'Invalid payload: expected a JSON object.';
  end if;

  -- entries ---------------------------------------------------------------
  -- Upsert + anti-join delete instead of delete-all-then-reinsert-all: a
  -- save no longer rewrites every row in the household's largest table when
  -- only one entry changed. The client still sends its full current entries
  -- array (no wire-format change), so "not in the payload" reliably means
  -- "deleted client-side" for the anti-join below.
  if jsonb_typeof(d->'entries') = 'array' then
    insert into entries (household_id, id, sort_order, description, type, amount,
                         start_date, repeats, recur_every, recur_unit, recur_days,
                         recur_end, category, notes, monthly_amounts, created_by)
    select hid,
           cf_bigint(e.value->>'id'),
           e.ord,
           coalesce(e.value->>'desc', ''),
           case when e.value->>'type' = 'income' then 'income' else 'expense' end,
           abs(coalesce(cf_num(e.value->>'amount'), 0)),
           coalesce(cf_date(e.value->>'startDate'), current_date),
           coalesce(cf_bool(e.value->>'repeats'), false),
           greatest(coalesce(cf_int(e.value->>'recurEvery'), 1), 1),
           case when e.value->>'recurUnit' in ('day','week','month','year','semimonth')
                then e.value->>'recurUnit' else 'month' end,
           cf_int_array(e.value->'recurDays'),
           cf_date(e.value->>'recurEnd'),
           coalesce(nullif(e.value->>'category', ''), 'Uncategorized'),
           coalesce(e.value->>'notes', ''),
           cf_num_array(e.value->'monthlyAmounts'),
           case when (e.value->>'userId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                then (e.value->>'userId')::uuid end
    from jsonb_array_elements(d->'entries') with ordinality e(value, ord)
    where cf_bigint(e.value->>'id') is not null
    on conflict (household_id, id) do update set
      sort_order = excluded.sort_order,
      description = excluded.description,
      type = excluded.type,
      amount = excluded.amount,
      start_date = excluded.start_date,
      repeats = excluded.repeats,
      recur_every = excluded.recur_every,
      recur_unit = excluded.recur_unit,
      recur_days = excluded.recur_days,
      recur_end = excluded.recur_end,
      category = excluded.category,
      notes = excluded.notes,
      monthly_amounts = excluded.monthly_amounts,
      created_by = excluded.created_by
    where (entries.sort_order, entries.description, entries.type, entries.amount,
           entries.start_date, entries.repeats, entries.recur_every, entries.recur_unit,
           entries.recur_days, entries.recur_end, entries.category, entries.notes,
           entries.monthly_amounts, entries.created_by)
      is distinct from
          (excluded.sort_order, excluded.description, excluded.type, excluded.amount,
           excluded.start_date, excluded.repeats, excluded.recur_every, excluded.recur_unit,
           excluded.recur_days, excluded.recur_end, excluded.category, excluded.notes,
           excluded.monthly_amounts, excluded.created_by);

    delete from entries e
    where e.household_id = hid
      and not exists (
        select 1 from jsonb_array_elements(d->'entries') x(value)
        where cf_bigint(x.value->>'id') = e.id
      );

    -- inline receipt images riding on entries (legacy blob / backup import)
    insert into receipts (household_id, owner_key, mime, data)
    select hid,
           'entry:' || (e.value->>'id'),
           coalesce(substring(e.value->>'attachment' from '^data:([^;,]+);base64,'), 'image/jpeg'),
           decode(regexp_replace(e.value->>'attachment', '^data:[^,]*,', ''), 'base64')
    from jsonb_array_elements(d->'entries') e(value)
    where e.value->>'attachment' like 'data:%;base64,%'
      and cf_bigint(e.value->>'id') is not null
    on conflict (household_id, owner_key)
      do update set mime = excluded.mime, data = excluded.data, updated_at = now();

    -- receipts whose entry no longer exists
    delete from receipts r
    where r.household_id = hid and r.owner_key like 'entry:%'
      and not exists (select 1 from entries e
                      where e.household_id = hid and r.owner_key = 'entry:' || e.id);
  end if;

  -- per-occurrence overrides ------------------------------------------------
  -- Same upsert + anti-join-delete pattern as entries above.
  if jsonb_typeof(d->'overridesByYr') = 'object' then
    insert into entry_overrides (household_id, year, occurrence_id, description,
                                 amount, day, notes, saved_at, history)
    select hid,
           cf_int(y.key, null),
           o.key,
           o.value->>'desc',
           cf_num(o.value->>'amount'),
           cf_int(o.value->>'day'),
           o.value->>'notes',
           cf_ts(o.value->>'_savedAt'),
           coalesce(case when jsonb_typeof(o.value->'_history') = 'array'
                         then o.value->'_history' end, '[]'::jsonb)
    from jsonb_each(d->'overridesByYr') y(key, value),
         jsonb_each(case when jsonb_typeof(y.value) = 'object'
                         then y.value else '{}'::jsonb end) o(key, value)
    where cf_int(y.key, null) is not null
    on conflict (household_id, year, occurrence_id) do update set
      description = excluded.description,
      amount = excluded.amount,
      day = excluded.day,
      notes = excluded.notes,
      saved_at = excluded.saved_at,
      history = excluded.history
    where (entry_overrides.description, entry_overrides.amount, entry_overrides.day,
           entry_overrides.notes, entry_overrides.saved_at, entry_overrides.history)
      is distinct from
          (excluded.description, excluded.amount, excluded.day,
           excluded.notes, excluded.saved_at, excluded.history);

    delete from entry_overrides v
    where v.household_id = hid
      and not exists (
        select 1
        from jsonb_each(d->'overridesByYr') y(key, value),
             jsonb_each(case when jsonb_typeof(y.value) = 'object'
                             then y.value else '{}'::jsonb end) o(key, value)
        where cf_int(y.key, null) = v.year and o.key = v.occurrence_id
      );

    -- inline receipt images riding on overrides
    insert into receipts (household_id, owner_key, mime, data)
    select hid,
           'override:' || y.key || ':' || o.key,
           coalesce(substring(o.value->>'attachment' from '^data:([^;,]+);base64,'), 'image/jpeg'),
           decode(regexp_replace(o.value->>'attachment', '^data:[^,]*,', ''), 'base64')
    from jsonb_each(d->'overridesByYr') y(key, value),
         jsonb_each(case when jsonb_typeof(y.value) = 'object'
                         then y.value else '{}'::jsonb end) o(key, value)
    where o.value->>'attachment' like 'data:%;base64,%'
      and cf_int(y.key, null) is not null
    on conflict (household_id, owner_key)
      do update set mime = excluded.mime, data = excluded.data, updated_at = now();

    -- receipts whose override no longer exists
    delete from receipts r
    where r.household_id = hid and r.owner_key like 'override:%'
      and not exists (select 1 from entry_overrides v
                      where v.household_id = hid
                        and r.owner_key = 'override:' || v.year || ':' || v.occurrence_id);
  end if;

  -- categories --------------------------------------------------------------
  if jsonb_typeof(d->'categories') = 'array' then
    insert into categories (household_id, name, color, sort_order)
    select hid, c.v,
           case when jsonb_typeof(d->'categoryColors') = 'object'
                then d->'categoryColors'->>c.v end,
           c.o
    from jsonb_array_elements_text(d->'categories') with ordinality c(v, o)
    where c.v is not null and c.v <> ''
    on conflict (household_id, name) do update set
      color = excluded.color,
      sort_order = excluded.sort_order
    where (categories.color, categories.sort_order) is distinct from (excluded.color, excluded.sort_order);

    delete from categories c
    where c.household_id = hid
      and not exists (
        select 1 from jsonb_array_elements_text(d->'categories') x(v)
        where x.v = c.name
      );
  end if;

  -- year configs --------------------------------------------------------------
  if jsonb_typeof(d->'yearConfigs') = 'array' then
    insert into year_configs (household_id, year, opening_balance)
    select hid, cf_int(y.value->>'year', null), coalesce(cf_num(y.value->>'openingBalance'), 0)
    from jsonb_array_elements(d->'yearConfigs') y(value)
    where cf_int(y.value->>'year', null) is not null
    on conflict (household_id, year) do update set
      opening_balance = excluded.opening_balance
    where year_configs.opening_balance is distinct from excluded.opening_balance;

    delete from year_configs y
    where y.household_id = hid
      and not exists (
        select 1 from jsonb_array_elements(d->'yearConfigs') x(value)
        where cf_int(x.value->>'year', null) = y.year
      );
  end if;

  -- budget targets ("YYYY:M" -> { category: amount }) -----------------------
  if jsonb_typeof(d->'budgetTargets') = 'object' then
    insert into budget_targets (household_id, year, month, category, amount)
    select hid,
           split_part(t.key, ':', 1)::int,
           split_part(t.key, ':', 2)::int,
           c.key,
           coalesce(cf_num(c.value #>> '{}'), 0)
    from jsonb_each(d->'budgetTargets') t(key, value),
         jsonb_each(case when jsonb_typeof(t.value) = 'object'
                         then t.value else '{}'::jsonb end) c(key, value)
    where t.key ~ '^\d+:\d+$'
      and split_part(t.key, ':', 2)::int between 0 and 11
    on conflict (household_id, year, month, category) do update set
      amount = excluded.amount
    where budget_targets.amount is distinct from excluded.amount;

    delete from budget_targets b
    where b.household_id = hid
      and not exists (
        select 1
        from jsonb_each(d->'budgetTargets') t(key, value),
             jsonb_each(case when jsonb_typeof(t.value) = 'object'
                             then t.value else '{}'::jsonb end) c(key, value)
        where t.key ~ '^\d+:\d+$'
          and split_part(t.key, ':', 1)::int = b.year
          and split_part(t.key, ':', 2)::int = b.month
          and c.key = b.category
      );
  end if;

  -- templates -----------------------------------------------------------
  -- Left as delete-all-then-reinsert: templates have no client-assigned
  -- stable id (the table's `id` is server-generated on every insert), so
  -- there's nothing to upsert against. Typically a short, rarely-edited
  -- list, unlike entries/overrides, so this isn't the scaling concern.
  if jsonb_typeof(d->'templates') = 'array' then
    delete from templates where household_id = hid;
    insert into templates (household_id, sort_order, description, type, amount,
                           category, repeats, recur_every, recur_unit, recur_days, notes)
    select hid, t.ord,
           coalesce(t.value->>'desc', ''),
           case when t.value->>'type' = 'income' then 'income' else 'expense' end,
           coalesce(cf_num(t.value->>'amount'), 0),
           coalesce(t.value->>'category', ''),
           coalesce(cf_bool(t.value->>'repeats'), false),
           greatest(coalesce(cf_int(t.value->>'recurEvery'), 1), 1),
           coalesce(t.value->>'recurUnit', 'month'),
           cf_int_array(t.value->'recurDays'),
           coalesce(t.value->>'notes', '')
    from jsonb_array_elements(d->'templates') with ordinality t(value, ord);
  end if;

  -- completed occurrences -----------------------------------------------------
  -- "on conflict do nothing" + anti-join delete (rather than delete-all then
  -- reinsert) also fixes a side effect of the old approach: completed_at
  -- used to get reset to now() on every autosave for every already-completed
  -- occurrence, since the row was destroyed and recreated each time.
  if jsonb_typeof(d->'completed') = 'object' then
    insert into completed_occurrences (household_id, occurrence_id)
    select hid, c.key
    from jsonb_each(d->'completed') c(key, value)
    where c.value <> 'false'::jsonb and c.value <> 'null'::jsonb
    on conflict (household_id, occurrence_id) do nothing;

    delete from completed_occurrences co
    where co.household_id = hid
      and not exists (
        select 1 from jsonb_each(d->'completed') c(key, value)
        where c.key = co.occurrence_id and c.value <> 'false'::jsonb and c.value <> 'null'::jsonb
      );
  end if;

  -- goals ---------------------------------------------------------------------
  if jsonb_typeof(d->'goals') = 'array' then
    insert into goals (household_id, id, sort_order, name, target, saved, monthly,
                       target_date, entry_id, payout_entry_id, created_at)
    select hid,
           cf_bigint(g.value->>'id'),
           g.ord,
           coalesce(g.value->>'name', ''),
           coalesce(cf_num(g.value->>'target'), 0),
           coalesce(cf_num(g.value->>'saved'), 0),
           coalesce(cf_num(g.value->>'monthly'), 0),
           cf_date(g.value->>'targetDate'),
           cf_bigint(g.value->>'entryId'),
           cf_bigint(g.value->>'payoutEntryId'),
           cf_ts(g.value->>'createdAt')
    from jsonb_array_elements(d->'goals') with ordinality g(value, ord)
    where cf_bigint(g.value->>'id') is not null
    on conflict (household_id, id) do update set
      sort_order = excluded.sort_order,
      name = excluded.name,
      target = excluded.target,
      saved = excluded.saved,
      monthly = excluded.monthly,
      target_date = excluded.target_date,
      entry_id = excluded.entry_id,
      payout_entry_id = excluded.payout_entry_id,
      created_at = excluded.created_at
    where (goals.sort_order, goals.name, goals.target, goals.saved, goals.monthly,
           goals.target_date, goals.entry_id, goals.payout_entry_id, goals.created_at)
      is distinct from
          (excluded.sort_order, excluded.name, excluded.target, excluded.saved, excluded.monthly,
           excluded.target_date, excluded.entry_id, excluded.payout_entry_id, excluded.created_at);

    delete from goals g
    where g.household_id = hid
      and not exists (
        select 1 from jsonb_array_elements(d->'goals') x(value)
        where cf_bigint(x.value->>'id') = g.id
      );
  end if;

  -- scalar settings (always upserted; marks the household as migrated) ----
  insert into household_settings as s
    (household_id, active_year, alert_threshold, dark_mode, forecast_horizon,
     ai_api_key, col_order, reg_filter, reg_filter_cats, reg_filter_scheds,
     reg_filter_status, dash_hidden, dash_order, schema_version, updated_at, updated_by)
  values
    (hid,
     cf_int(d->>'activeYear'),
     cf_num(d->>'alertThreshold'),
     cf_bool(d->>'darkMode'),
     cf_int(d->>'forecastHorizon'),
     d->>'aiApiKey',
     cf_text_array(d->'colOrder'),
     d->>'regFilter',
     cf_text_array(d->'regFilterCats'),
     cf_text_array(d->'regFilterScheds'),
     cf_text_array(d->'regFilterStatus'),
     case when jsonb_typeof(d->'dashHidden') = 'object' then d->'dashHidden' else '{}'::jsonb end,
     cf_text_array(d->'dashOrder'),
     cf_int(d->>'schemaVersion'),
     now(),
     auth.uid())
  -- Every column below falls back to the existing stored value (s.*) when its
  -- JSON key is absent from the payload — e.g. an older client that predates a
  -- newer scalar setting — so a partial/stale payload can never null out
  -- another member's up-to-date setting, matching the "never wipe what a
  -- payload doesn't know about" guarantee the rest of this function enforces.
  on conflict (household_id) do update set
     active_year = case when d ? 'activeYear' then excluded.active_year else s.active_year end,
     alert_threshold = case when d ? 'alertThreshold' then excluded.alert_threshold else s.alert_threshold end,
     dark_mode = case when d ? 'darkMode' then excluded.dark_mode else s.dark_mode end,
     forecast_horizon = case when d ? 'forecastHorizon' then excluded.forecast_horizon else s.forecast_horizon end,
     ai_api_key = case when d ? 'aiApiKey' then excluded.ai_api_key else s.ai_api_key end,
     col_order = case when d ? 'colOrder' then excluded.col_order else s.col_order end,
     reg_filter = case when d ? 'regFilter' then excluded.reg_filter else s.reg_filter end,
     reg_filter_cats = case when d ? 'regFilterCats' then excluded.reg_filter_cats else s.reg_filter_cats end,
     reg_filter_scheds = case when d ? 'regFilterScheds' then excluded.reg_filter_scheds else s.reg_filter_scheds end,
     reg_filter_status = case when d ? 'regFilterStatus' then excluded.reg_filter_status else s.reg_filter_status end,
     dash_hidden = case when d ? 'dashHidden' then excluded.dash_hidden else s.dash_hidden end,
     dash_order = case when d ? 'dashOrder' then excluded.dash_order else s.dash_order end,
     schema_version = case when d ? 'schemaVersion' then excluded.schema_version else s.schema_version end,
     updated_at = now(),
     updated_by = excluded.updated_by;
end $$;

-- Internal helpers are not part of the client API surface.
revoke execute on function cf_apply_household_payload(uuid, jsonb) from public, anon, authenticated;
revoke execute on function cf_num(text, numeric) from public, anon, authenticated;
revoke execute on function cf_int(text, int) from public, anon, authenticated;
revoke execute on function cf_bigint(text, bigint) from public, anon, authenticated;
revoke execute on function cf_bool(text, boolean) from public, anon, authenticated;
revoke execute on function cf_date(text) from public, anon, authenticated;
revoke execute on function cf_ts(text) from public, anon, authenticated;
revoke execute on function cf_text_array(jsonb) from public, anon, authenticated;
revoke execute on function cf_int_array(jsonb) from public, anon, authenticated;
revoke execute on function cf_num_array(jsonb) from public, anon, authenticated;

-- Client RPCs -----------------------------------------------------------------

-- Resolve the calling user's household or raise. Internal.
create or replace function cf_my_household()
returns uuid
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  hid uuid;
begin
  select household_id into hid from household_members where user_id = auth.uid() and not disabled limit 1;
  if hid is null then
    raise exception 'You must belong to a household first.';
  end if;
  return hid;
end $$;
revoke execute on function cf_my_household() from public, anon, authenticated;

-- Save the caller's full budget state into the normalized tables (atomic).
-- The app strips receipt images out of the payload before calling this;
-- receipts change through put_receipt / delete_receipt instead.
-- Kept (not dropped) alongside the 2-arg conflict-aware overload below so
-- an already-open browser tab, or an install that hasn't re-run this file
-- yet, keeps saving — just without conflict detection.
create or replace function save_household(p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform cf_apply_household_payload(cf_my_household(), p_data);
end $$;

-- Conflict-aware save (round-8 audit AR2): p_expected_saved_at is the
-- `savedAt` value the caller last got back from load_household(). If another
-- member's save has landed since — household_settings.updated_at no longer
-- matches — this raises instead of silently overwriting their change
-- (previously last-write-wins with no detection at all). The row is locked
-- for update first so two concurrent conflict-checked saves can't both pass
-- the check and then race each other into cf_apply_household_payload.
-- A null p_expected_saved_at (e.g. a save before any load ever completed)
-- skips the check, same as the 1-arg overload above. Returns the new
-- updated_at so the caller can track it for its next save.
create or replace function save_household(p_data jsonb, p_expected_saved_at timestamptz)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid := cf_my_household();
  current_saved_at timestamptz;
  new_saved_at timestamptz;
begin
  select updated_at into current_saved_at
  from household_settings where household_id = hid for update;

  if p_expected_saved_at is not null and current_saved_at is not null
     and current_saved_at <> p_expected_saved_at then
    raise exception 'CONFLICT: household data changed since you last loaded it.';
  end if;

  perform cf_apply_household_payload(hid, p_data);

  select updated_at into new_saved_at
  from household_settings where household_id = hid;
  return new_saved_at;
end $$;

-- Load the caller's full budget state, rebuilt from the normalized tables.
-- Returns { "data": <payload>, "receipts": [{ownerKey, mime, b64}, ...] }.
-- For a household that has never saved (no household_settings row) data is {},
-- so any not-yet-synced local data on the device is preserved and adopted.
create or replace function load_household()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  hid uuid := cf_my_household();
  payload jsonb;
  rcpts jsonb;
begin
  if not exists (select 1 from household_settings where household_id = hid) then
    return jsonb_build_object('data', '{}'::jsonb, 'receipts', '[]'::jsonb);
  end if;

  select jsonb_build_object(
    'entries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'desc', e.description,
        'type', e.type,
        'amount', e.amount,
        'startDate', to_char(e.start_date, 'YYYY-MM-DD'),
        'repeats', e.repeats,
        'recurEvery', e.recur_every,
        'recurUnit', e.recur_unit,
        'recurDays', to_jsonb(e.recur_days),
        'recurEnd', coalesce(to_char(e.recur_end, 'YYYY-MM-DD'), ''),
        'category', e.category,
        'notes', e.notes,
        'monthlyAmounts', coalesce(to_jsonb(e.monthly_amounts), 'null'::jsonb),
        'userId', e.created_by
      ) order by e.sort_order, e.id)
      from entries e where e.household_id = hid), '[]'::jsonb),
    'overridesByYr', coalesce((
      select jsonb_object_agg(w.year::text, w.ovs)
      from (
        select v.year,
               jsonb_object_agg(v.occurrence_id,
                 jsonb_strip_nulls(jsonb_build_object(
                   'desc', v.description,
                   'amount', v.amount,
                   'day', v.day,
                   'notes', v.notes,
                   '_savedAt', v.saved_at
                 )) || jsonb_build_object('_history', v.history)) as ovs
        from entry_overrides v where v.household_id = hid
        group by v.year
      ) w), '{}'::jsonb),
    'categories', coalesce((
      select jsonb_agg(to_jsonb(c.name) order by c.sort_order)
      from categories c where c.household_id = hid), '[]'::jsonb),
    'categoryColors', coalesce((
      select jsonb_object_agg(c.name, c.color)
      from categories c where c.household_id = hid and c.color is not null), '{}'::jsonb),
    'yearConfigs', coalesce((
      select jsonb_agg(jsonb_build_object('year', y.year, 'openingBalance', y.opening_balance)
                       order by y.year)
      from year_configs y where y.household_id = hid), '[]'::jsonb),
    'budgetTargets', coalesce((
      select jsonb_object_agg(w.k, w.m)
      from (
        select b.year::text || ':' || b.month as k,
               jsonb_object_agg(b.category, b.amount) as m
        from budget_targets b where b.household_id = hid
        group by b.year, b.month
      ) w), '{}'::jsonb),
    'templates', coalesce((
      select jsonb_agg(jsonb_build_object(
        'desc', t.description,
        'type', t.type,
        'amount', t.amount,
        'category', t.category,
        'repeats', t.repeats,
        'recurEvery', t.recur_every,
        'recurUnit', t.recur_unit,
        'recurDays', to_jsonb(t.recur_days),
        'notes', t.notes
      ) order by t.sort_order)
      from templates t where t.household_id = hid), '[]'::jsonb),
    'completed', coalesce((
      select jsonb_object_agg(co.occurrence_id, to_jsonb(true))
      from completed_occurrences co where co.household_id = hid), '{}'::jsonb),
    'goals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id,
        'name', g.name,
        'target', g.target,
        'saved', g.saved,
        'monthly', g.monthly,
        'targetDate', coalesce(to_char(g.target_date, 'YYYY-MM-DD'), ''),
        'entryId', g.entry_id,
        'payoutEntryId', g.payout_entry_id,
        'createdAt', g.created_at
      ) order by g.sort_order, g.id)
      from goals g where g.household_id = hid), '[]'::jsonb)
  ) || coalesce((
    select jsonb_strip_nulls(jsonb_build_object(
      'activeYear', s.active_year,
      'alertThreshold', s.alert_threshold,
      'darkMode', s.dark_mode,
      'forecastHorizon', s.forecast_horizon,
      'aiApiKey', s.ai_api_key,
      'colOrder', to_jsonb(s.col_order),
      'regFilter', s.reg_filter,
      'regFilterCats', to_jsonb(s.reg_filter_cats),
      'regFilterScheds', to_jsonb(s.reg_filter_scheds),
      'regFilterStatus', to_jsonb(s.reg_filter_status),
      'dashHidden', s.dash_hidden,
      'dashOrder', to_jsonb(s.dash_order),
      'schemaVersion', s.schema_version,
      'savedAt', s.updated_at
    ))
    from household_settings s where s.household_id = hid), '{}'::jsonb)
  into payload;

  select coalesce(jsonb_agg(jsonb_build_object(
           'ownerKey', r.owner_key,
           'mime', r.mime,
           'b64', replace(encode(r.data, 'base64'), e'\n', '')
         )), '[]'::jsonb)
  into rcpts
  from receipts r where r.household_id = hid;

  return jsonb_build_object('data', payload, 'receipts', rcpts);
end $$;

-- Store (insert or replace) one receipt image for the caller's household.
-- p_b64 is the raw base64 image data (no data: URL prefix). Only
-- per-occurrence keys are accepted — receipts always belong to a single
-- dated instance, never to a whole (possibly repeating) entry.
create or replace function put_receipt(p_owner_key text, p_mime text, p_b64 text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid := cf_my_household();
begin
  if p_owner_key is null or p_owner_key !~ '^override:' then
    raise exception 'Invalid receipt owner key: receipts are per-occurrence (override:<year>:<occurrenceId>).';
  end if;
  insert into receipts (household_id, owner_key, mime, data)
  values (hid, p_owner_key, coalesce(nullif(p_mime, ''), 'image/jpeg'), decode(p_b64, 'base64'))
  on conflict (household_id, owner_key)
    do update set mime = excluded.mime, data = excluded.data, updated_at = now();
end $$;

create or replace function delete_receipt(p_owner_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from receipts where household_id = cf_my_household() and owner_key = p_owner_key;
end $$;

-- Household lifecycle RPCs ----------------------------------------------------

-- Called once, right after a brand-new user's first sign-in, if they don't
-- already belong to a household. Creates the household and makes the caller its
-- owner. (No data rows are seeded — the first save creates them, which also
-- lets any local-only data on the device be adopted into the household.)
create or replace function create_household(p_full_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
begin
  if exists (select 1 from household_members where user_id = auth.uid()) then
    raise exception 'You already belong to a household.';
  end if;
  insert into households(name) values ('My Household') returning id into hid;
  insert into household_members(household_id, user_id, full_name, role)
    values (hid, auth.uid(), coalesce(p_full_name, ''), 'owner');
  return hid;
end;
$$;

-- Called by an existing household member to generate a short code another
-- family member can redeem to join the same household.
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
  select household_id into hid from household_members where user_id = auth.uid() and not disabled limit 1;
  if hid is null then
    raise exception 'You must belong to a household first.';
  end if;
  code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
  insert into household_invites(code, household_id, created_by) values (code, hid, auth.uid());
  return code;
end;
$$;

-- Called by a brand-new (or household-less) user with a code someone shared
-- with them, to join that household.
create or replace function join_household(p_code text, p_full_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
begin
  if exists (select 1 from household_members where user_id = auth.uid()) then
    raise exception 'You already belong to a household.';
  end if;
  select household_id into hid from household_invites
    where code = upper(p_code) and used_by is null and expires_at > now();
  if hid is null then
    raise exception 'Invite code not found or expired.';
  end if;
  insert into household_members(household_id, user_id, full_name)
    values (hid, auth.uid(), coalesce(p_full_name, ''));
  update household_invites set used_by = auth.uid(), used_at = now() where code = upper(p_code);
  return hid;
end;
$$;

-- One-time data migration -----------------------------------------------------
-- Copies each household's legacy JSONB blob into the normalized tables.
-- Runs only for households that have blob data but no household_settings row
-- (i.e. not yet migrated), so this whole file stays safe to re-run.
-- The household_data blob itself is left untouched as a backup.
do $$
declare
  r record;
  migrated int := 0;
begin
  for r in
    select hd.household_id, hd.data
    from household_data hd
    where jsonb_typeof(hd.data) = 'object'
      and hd.data <> '{}'::jsonb
      and not exists (select 1 from household_settings s
                      where s.household_id = hd.household_id)
  loop
    perform cf_apply_household_payload(r.household_id, r.data);
    migrated := migrated + 1;
    raise notice 'Migrated household % (% entries, % receipts extracted)',
      r.household_id,
      (select count(*) from entries e where e.household_id = r.household_id),
      (select count(*) from receipts rc where rc.household_id = r.household_id);
  end loop;
  if migrated = 0 then
    raise notice 'No households needed migration (already migrated or no legacy data).';
  else
    raise notice 'Migration complete: % household(s) migrated. The legacy household_data table was kept as a backup.', migrated;
  end if;
end $$;

-- Receipts are per-occurrence only: re-key any legacy entry-level receipts
-- ('entry:<id>', from blob data migrated before this rule) onto the entry's
-- start-date occurrence, creating the matching entry_overrides row so the app
-- picks the image up. If that occurrence already has its own receipt, the
-- per-occurrence one wins and the entry-level copy is dropped. Idempotent:
-- after one run no 'entry:%' receipts remain.
do $$
declare
  r record;
  yr int;
  occ text;
  tgt text;
  moved int := 0;
begin
  for r in
    select rc.id as receipt_id, rc.household_id, e.id as entry_id, e.start_date
    from receipts rc
    join entries e
      on e.household_id = rc.household_id
     and rc.owner_key = 'entry:' || e.id
  loop
    yr := extract(year from r.start_date)::int;
    occ := r.entry_id || '-' || yr || '-'
        || (extract(month from r.start_date)::int - 1) || '-'
        || extract(day from r.start_date)::int;
    tgt := 'override:' || yr || ':' || occ;
    if exists (select 1 from receipts x
               where x.household_id = r.household_id and x.owner_key = tgt) then
      delete from receipts where id = r.receipt_id;
    else
      insert into entry_overrides (household_id, year, occurrence_id)
      values (r.household_id, yr, occ)
      on conflict (household_id, year, occurrence_id) do nothing;
      update receipts set owner_key = tgt, updated_at = now() where id = r.receipt_id;
      moved := moved + 1;
    end if;
  end loop;
  delete from receipts where owner_key like 'entry:%';
  if moved > 0 then
    raise notice 'Re-keyed % entry-level receipt(s) to their start-date occurrence.', moved;
  end if;
end $$;
