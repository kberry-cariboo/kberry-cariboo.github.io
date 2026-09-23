-- Receipt images: fingerprinted, listed without their bytes, fetched one at a
-- time, and kept inside the household they belong to.
--
-- Every load_household used to carry every receipt the household had ever
-- attached, base64, on every launch. Now the load carries a manifest (key, type,
-- SHA-256 of the bytes) and a device fetches only what it lacks. The old
-- zero-argument load_household() still returns the images inline, for tabs
-- opened before the change.
--
--   psql -v ON_ERROR_STOP=1 -f supabase/schema.sql
--   psql -v ON_ERROR_STOP=1 -f tests/receipts.sql
do $$
declare
  owner_id uuid := gen_random_uuid();
  viewer_id uuid := gen_random_uuid();
  other_id uuid := gen_random_uuid();
  hid uuid;
  code text;
  got jsonb;
  item jsonb;
  -- "hello receipt" — small, and its SHA-256 is easy to check independently.
  b64 text := encode(convert_to('hello receipt', 'UTF8'), 'base64');
  want_sig text := encode(sha256(convert_to('hello receipt', 'UTF8')), 'hex');
  checks int := 0;
begin
  insert into auth.users (id, email) values
    (owner_id, 'rc-owner@example.com'), (viewer_id, 'rc-viewer@example.com'), (other_id, 'rc-other@example.com');
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  hid := create_household('Owner');
  perform save_household(jsonb_build_object('entries', '[]'::jsonb, 'schemaVersion', 999), null);
  code := create_invite();
  perform set_config('request.jwt.claim.sub', viewer_id::text, true);
  perform join_household(code, 'Viewer');
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  update household_members set role = 'viewer' where user_id = viewer_id;

  perform put_receipt('override:2026:e1-2026-0-1', 'image/png', b64);

  -- ── The fingerprint ───────────────────────────────────────────────────────
  if (select sig from receipts where household_id = hid) is distinct from want_sig then
    raise exception 'receipts: the stored fingerprint is not the SHA-256 of the image';
  end if;
  checks := checks + 1;
  -- Set however the image arrives, not only through put_receipt.
  update receipts set data = convert_to('replaced', 'UTF8') where household_id = hid;
  if (select sig from receipts where household_id = hid) is distinct from encode(sha256(convert_to('replaced', 'UTF8')), 'hex') then
    raise exception 'receipts: changing the image left the old fingerprint behind';
  end if;
  checks := checks + 1;
  perform put_receipt('override:2026:e1-2026-0-1', 'image/png', b64);

  -- ── The manifest load carries no image ────────────────────────────────────
  got := load_household(false);
  item := got->'receipts'->0;
  if jsonb_array_length(got->'receipts') <> 1 or item ? 'b64' then
    raise exception 'receipts: load_household(false) still carries image bytes: %', left(got->>'receipts', 120);
  end if;
  if item->>'ownerKey' <> 'override:2026:e1-2026-0-1' or item->>'sig' <> want_sig or item->>'mime' <> 'image/png' then
    raise exception 'receipts: the manifest entry is wrong: %', item;
  end if;
  checks := checks + 1;

  -- ── The old load is unchanged, for tabs from before ──────────────────────
  item := (load_household())->'receipts'->0;
  if item->>'b64' is distinct from replace(b64, e'\n', '') then
    raise exception 'receipts: the zero-argument load_household() no longer returns the image inline';
  end if;
  checks := checks + 1;

  -- ── Fetching one ──────────────────────────────────────────────────────────
  item := get_receipt('override:2026:e1-2026-0-1');
  if item->>'b64' is distinct from replace(b64, e'\n', '') or item->>'sig' <> want_sig then
    raise exception 'receipts: get_receipt did not return the image: %', item;
  end if;
  checks := checks + 1;
  if get_receipt('override:2026:nope') is not null then
    raise exception 'receipts: get_receipt invented a receipt that does not exist';
  end if;
  checks := checks + 1;

  -- A view-only member reads receipts like everything else.
  perform set_config('request.jwt.claim.sub', viewer_id::text, true);
  if (get_receipt('override:2026:e1-2026-0-1'))->>'b64' is null then
    raise exception 'receipts: a view-only member cannot see a receipt';
  end if;
  checks := checks + 1;

  -- Someone in another household gets nothing, even with the exact key.
  perform set_config('request.jwt.claim.sub', other_id::text, true);
  perform create_household('Other');
  if get_receipt('override:2026:e1-2026-0-1') is not null then
    raise exception 'receipts: another household''s member fetched this household''s receipt';
  end if;
  checks := checks + 1;

  raise notice 'receipts: all % checks passed', checks;
end $$;
