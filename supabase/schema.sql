-- CashFlow Budget — Supabase schema
--
-- Run this once in your Supabase project's SQL editor (Dashboard -> SQL Editor ->
-- New query -> paste this whole file -> Run). Safe to re-run: every statement is
-- idempotent (create-if-not-exists / drop-and-recreate policies & functions).
--
-- Model: a "household" is a shared budget. Each real person signs in with their own
-- Supabase account (email + password) and joins a household either by creating one
-- (first-time sign-up) or by entering an invite code from an existing member. All
-- household members can read and write the same shared budget data.
--
-- Security: Row Level Security (RLS) is the actual access boundary — the anon key
-- shipped in the app's source is not a secret, it just identifies your project.
-- Nobody can read/write another household's data because every policy below checks
-- the caller is a member of the household they're touching.

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

create table if not exists household_data (
  household_id uuid primary key references households(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  schema_version int not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table households enable row level security;
alter table household_members enable row level security;
alter table household_invites enable row level security;
alter table household_data enable row level security;

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
    where m.household_id = hid and m.user_id = auth.uid()
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
    where m.household_id = hid and m.user_id = auth.uid() and m.role = 'owner'
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

drop policy if exists "read household data" on household_data;
create policy "read household data" on household_data
  for select using (is_household_member(household_id));

drop policy if exists "update household data" on household_data;
create policy "update household data" on household_data
  for update using (is_household_member(household_id)) with check (is_household_member(household_id));

drop policy if exists "insert household data" on household_data;
create policy "insert household data" on household_data
  for insert with check (is_household_member(household_id));

-- Invites: members can see invites for their own household (to display
-- pending/used codes); creation and redemption go through the RPCs below,
-- which run as security definer so a brand-new member (not yet in the
-- household) can redeem a code without needing broader table access.
drop policy if exists "read own household invites" on household_invites;
create policy "read own household invites" on household_invites
  for select using (is_household_member(household_id));

-- RPCs -----------------------------------------------------------------

-- Called once, right after a brand-new user's first sign-in, if they don't
-- already belong to a household. Creates the household, makes the caller its
-- owner, and seeds an empty data row.
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
  insert into household_data(household_id, data) values (hid, '{}'::jsonb);
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
  select household_id into hid from household_members where user_id = auth.uid() limit 1;
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
